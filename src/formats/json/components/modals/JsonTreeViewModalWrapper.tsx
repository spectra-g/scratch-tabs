import { useEffect } from "react";

import { JsonTreeViewModal, useJsonTreeView } from "../JsonTreeView";

interface JsonTreeViewModalWrapperProps {
  json: string;
  onClose: () => void;
}

export const JsonTreeViewModalWrapper: React.FC<
  JsonTreeViewModalWrapperProps
> = ({ json, onClose }) => {
  const { isOpen, openTreeView, closeTreeView } = useJsonTreeView();
  useEffect(() => {
    if (json) {
      openTreeView(json);
    }
  }, [json]);

  const closeAll = () => {
    closeTreeView();
    onClose();
  };

  return (
    <>{isOpen && <JsonTreeViewModal jsonString={json} onClose={closeAll} />}</>
  );
};
