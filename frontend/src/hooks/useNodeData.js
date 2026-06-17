import { useCallback } from 'react';
import { useStore } from '../store';
import { shallow } from 'zustand/shallow';

export const useNodeData = (nodeId, fieldName, defaultValue = '') => {
  const { value, updateNodeField } = useStore(
    (state) => ({
      value: state.nodes.find((n) => n.id === nodeId)?.data?.[fieldName],
      updateNodeField: state.updateNodeField,
    }),
    shallow
  );

  const resolvedValue = value !== undefined && value !== null ? value : defaultValue;

  const setValue = useCallback(
    (newValue) => {
      updateNodeField(nodeId, fieldName, newValue);
    },
    [nodeId, fieldName, updateNodeField]
  );

  const onChange = useCallback(
    (event) => {
      setValue(event.target.value);
    },
    [setValue]
  );

  return [resolvedValue, setValue, onChange];
};
