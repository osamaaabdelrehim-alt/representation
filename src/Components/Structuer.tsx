import { useEffect, useRef, useState } from "react";
import type {ObjectProperties,ObjectSelector, ObjectState, WorkspaceAPI} from 'trimble-connect-workspace-api';
import { ModusButton,ModusTooltip} from '@trimble-oss/modus-react-components';

type ConditionGroup = {
    property: string;
    operator: string;
    min: string;
    max?: string;
};

type ObjectWithValue = {
    properties: ObjectProperties;
    value: string;
};


export default function ProgressControl({ api }: { api: WorkspaceAPI }) {
    const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([
        { property: "", operator: "=", min: "", max: "" },
    ]);
    const [, setFilteredObjects] = useState<ObjectWithValue[]>([]);
    const modelId = useRef<string>("");
    //const allModelObjects = useRef<ObjectProperties[]>([]);
    const allModelObjects = useRef<{ modelId: string; objects: ObjectProperties[] }[]>([]);
    const preIds = useRef<number[]>([]);

    const propertyOptions = ["KLR_ratio", "Act.Ratio_stress", "Act.Ratio_def"];
    const operatorOptions = ["=", "<", "<=", ">", ">=", "between"];
    const groupColors = ["Red", "Yellow", "Blue", "Pink", "Green", "Orange"];
    const maxConditions = 3;

    useEffect(() => {
        getObjectProperties();
    }, []);

    //async function getObjectProperties() {
    //    const objectSelector: ObjectSelector = { output: { loadProperties: true } };
    //    if (!api) return;
    //    const response = await api.viewer.getObjects(objectSelector);
    //    if (response.length === 0) return;
    //    for (const model of response) {
    //        modelId.current = model.modelId;
    //        allModelObjects.current = model.objects;
    //    }
    //}
    async function getObjectProperties() {
        const objectSelector: ObjectSelector = { output: { loadProperties: true } };
        if (!api) return;

        const response = await api.viewer.getObjects(objectSelector);
        if (response.length === 0) return;

        const allModels = response.map(model => ({
            modelId: model.modelId,
            objects: model.objects,
        }));

        allModelObjects.current = allModels;
    }
    function updateGroup(index: number, field: keyof ConditionGroup, value: string) {
        const newGroups = [...conditionGroups];
        newGroups[index][field] = value;
        setConditionGroups(newGroups);
    }

    function addGroup() {
        if (conditionGroups.length >= maxConditions) return;
        setConditionGroups([
            ...conditionGroups,
            { property: "", operator: "=", min: "", max: "" },
        ]);
    }

    function removeGroup(index: number) {
        const updated = conditionGroups.filter((_, i) => i !== index);
        setConditionGroups(updated);
    }

    function evaluateCondition(
        operator: string,
        propValue: string | number,
        min: string,
        max?: string
    ): boolean {
        const val = parseFloat(propValue as string);
        const minVal = parseFloat(min);
        const maxVal = max ? parseFloat(max) : NaN;

        switch (operator) {
            case "=": return val === minVal;
            case ">": return val > minVal;
            case ">=": return val >= minVal;
            case "<": return val < minVal;
            case "<=": return val <= minVal;
            case "between": return val >= minVal && val <= maxVal;
            default: return false;
        }
    }

    //async function performSearch() {
    //    const matchedIdsSet = new Set<number>();
    //    const allIds = allModelObjects.current.map(obj => obj.id as number);
    //    const allMatchedObjects: ObjectWithValue[] = [];

    //    for (let i = 0; i < conditionGroups.length; i++) {
    //        const group = conditionGroups[i];
    //        const groupResults: ObjectWithValue[] = [];

    //        for (const modelObject of allModelObjects.current) {
    //            if (!modelObject.properties) continue;

    //            const allProps = modelObject.properties.flatMap(pSet => pSet.properties || []);
    //            const prop = allProps.find(p => p.name === group.property);

    //            if (prop && evaluateCondition(group.operator, prop.value, group.min, group.max)) {
    //                groupResults.push({ properties: modelObject, value: prop.value.toString() });
    //                matchedIdsSet.add(modelObject.id as number);
    //            }
    //        }

    //        if (groupResults.length > 0) {
    //            const objectSelector: ObjectSelector = {
    //                modelObjectIds: [{
    //                    modelId: modelId.current,
    //                    objectRuntimeIds: groupResults.map(r => r.properties.id)
    //                }]
    //            };
    //            const objectState: ObjectState = { color: groupColors[i] || "Red" };
    //            await api.viewer.setObjectState(objectSelector, objectState);
    //        }

    //        allMatchedObjects.push(...groupResults);
    //    }

    //    const unmatchedIds = allIds.filter(id => !matchedIdsSet.has(id));
    //    if (unmatchedIds.length > 0) {
    //        const objectSelectorGray: ObjectSelector = {
    //            modelObjectIds: [{
    //                modelId: modelId.current,
    //                objectRuntimeIds: unmatchedIds
    //            }]
    //        };
    //        const objectStateGray: ObjectState = { color: "gray" };
    //        await api.viewer.setObjectState(objectSelectorGray, objectStateGray);
    //    }

    //    preIds.current = allIds;
    //    setFilteredObjects(allMatchedObjects);
    //}
    async function performSearch() {
        const matchedIdsPerModel = new Map<string, Set<number>>();
        const allMatchedObjects: ObjectWithValue[] = [];
        const allIdsPerModel = new Map<string, number[]>();

        for (let i = 0; i < conditionGroups.length; i++) {
            const group = conditionGroups[i];
            const groupResultsPerModel = new Map<string, ObjectWithValue[]>();

            for (const { modelId, objects } of allModelObjects.current) {
                const matchedIds = matchedIdsPerModel.get(modelId) || new Set<number>();
                const allIds = allIdsPerModel.get(modelId) || [];

                for (const obj of objects) {
                    allIds.push(obj.id as number);

                    if (!obj.properties) continue;

                    const allProps = obj.properties.flatMap(pSet => pSet.properties || []);
                    const prop = allProps.find(p => p.name === group.property);

                    if (prop && evaluateCondition(group.operator, prop.value, group.min, group.max)) {
                        const result: ObjectWithValue = { properties: obj, value: prop.value.toString() };

                        if (!groupResultsPerModel.has(modelId)) {
                            groupResultsPerModel.set(modelId, []);
                        }
                        groupResultsPerModel.get(modelId)!.push(result);
                        matchedIds.add(obj.id as number);
                    }
                }

                matchedIdsPerModel.set(modelId, matchedIds);
                allIdsPerModel.set(modelId, allIds);
            }

            // Apply color to matched objects per model
            for (const [modelId, results] of groupResultsPerModel.entries()) {
                const objectSelector: ObjectSelector = {
                    modelObjectIds: [{
                        modelId,
                        objectRuntimeIds: results.map(r => r.properties.id)
                    }]
                };
                const objectState: ObjectState = { color: groupColors[i] || "Red" };
                await api.viewer.setObjectState(objectSelector, objectState);
                allMatchedObjects.push(...results);
            }
        }

        // Gray out unmatched objects per model
        for (const [modelId, allIds] of allIdsPerModel.entries()) {
            const matchedSet = matchedIdsPerModel.get(modelId) || new Set();
            const unmatchedIds = allIds.filter(id => !matchedSet.has(id));

            if (unmatchedIds.length > 0) {
                const objectSelectorGray: ObjectSelector = {
                    modelObjectIds: [{
                        modelId,
                        objectRuntimeIds: unmatchedIds
                    }]
                };
                const objectStateGray: ObjectState = { color: "gray" };
                await api.viewer.setObjectState(objectSelectorGray, objectStateGray);
            }
        }

        // Update preIds with all IDs across models
        preIds.current = Array.from(allIdsPerModel.values()).flat();
        setFilteredObjects(allMatchedObjects);
    }

    async function clearFun() {
        if (!preIds.current.length) return;

        const objectSelectorRemove: ObjectSelector = {
            modelObjectIds: [{ modelId: modelId.current, objectRuntimeIds: preIds.current }]
        };
        const objectStateRemove: ObjectState = { color: "reset" };
        await api.viewer.setObjectState(objectSelectorRemove, objectStateRemove);

        setFilteredObjects([]);
        preIds.current = [];
    }

    return (
        <div className="content-panel">
            <div className="row align-items-center" style={{ justifyContent: "space-between", marginBottom: "10px" }}>

                <ModusTooltip text="Refresh model">
                    <ModusButton
                        className="col"
                        size="small"
                        buttonStyle="borderless"
                        onClick={getObjectProperties}
                    >
                        <i className="modus-icons">Refresh</i>
                    </ModusButton>
                </ModusTooltip>
            </div>

            {conditionGroups.map((group, index) => (
                <div
                    key={index}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                        flexWrap: "wrap"
                    }}
                >
                    {/* Color box */}
                    <div
                        style={{
                            width: "16px",
                            height: "16px",
                            backgroundColor: groupColors[index] || "red",
                            border: "1px solid #ccc",
                            borderRadius: "3px"
                        }}
                        title={`Group color: ${groupColors[index] || "Red"}`}
                    ></div>

                    {/* Property selector */}
                    <select
                        className="form-select"
                        value={group.property}
                        onChange={(e) => updateGroup(index, "property", e.target.value)}
                        style={{ minWidth: "150px" }}
                    >
                        <option value="">-- Property --</option>
                        {propertyOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>

                    {/* Operator selector */}
                    <select
                        className="form-select"
                        value={group.operator}
                        onChange={(e) => updateGroup(index, "operator", e.target.value)}
                        style={{ width: "105px" }}
                    >
                        {operatorOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>

                    {/* Min input */}
                    <input
                        type="number"
                        className="modus-text-input"
                        placeholder="Min value"
                        value={group.min}
                        onChange={(e) => updateGroup(index, "min", e.target.value)}
                    />

                    {/* Max input if 'between' operator is selected */}
                    {group.operator === "between" && (
                        <input
                            type="number"
                            className="modus-text-input"
                            placeholder="Max value"
                            value={group.max}
                            onChange={(e) => updateGroup(index, "max", e.target.value)}
                        />
                    )}

                    {/* Remove button */}
                    {conditionGroups.length > 1 && (
                        <ModusButton size="small" onClick={() => removeGroup(index)}>Remove</ModusButton>
                    )}
                </div>
            ))}


            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginLeft: '0px' }}>
                <ModusButton onClick={addGroup} disabled={conditionGroups.length >= maxConditions}>
                    Add Condition Group
                </ModusButton>
                <ModusButton onClick={performSearch}>Search</ModusButton>
                <ModusButton onClick={clearFun}>Clear</ModusButton>
            </div>
        </div>
    );
}
