import React from 'react';
import { Hash, MessageSquare, FileText } from '../../../../components/Icons';
import { YamlNode } from '../../utils/yamlParser';

interface NodeDetailsProps {
    selectedNode: YamlNode | null;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ selectedNode }) => {
    if (!selectedNode) {
        return (
            <div className="flex items-center justify-center h-full text-secondary text-sm">
                <p>Select a node to view details</p>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-2">
            {/* Path */}
            <div className="flex items-start space-x-2">
                <Hash size={14} className="text-info mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-secondary mb-0.5">Path</div>
                    <div className="text-sm text-main font-mono break-all">{selectedNode.path}</div>
                </div>
            </div>

            {/* Type and Value */}
            <div className="flex items-start space-x-2">
                <FileText size={14} className="text-info mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-secondary mb-0.5">Type</div>
                    <div className="text-sm text-main">
                        <span className="font-mono">{selectedNode.type}</span>
                        {selectedNode.value !== undefined && selectedNode.type !== 'object' && selectedNode.type !== 'array' && (
                            <span className="ml-2 text-secondary">
                                = {String(selectedNode.value).substring(0, 100)}
                                {String(selectedNode.value).length > 100 && '...'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments */}
            {(selectedNode.commentBefore || selectedNode.comment) && (
                <div className="flex items-start space-x-2">
                    <MessageSquare size={14} className="text-success mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-secondary mb-0.5">Comments</div>
                        <div className="text-sm text-success space-y-1">
                            {selectedNode.commentBefore && (
                                <div className="italic font-mono">
                                    # {selectedNode.commentBefore}
                                </div>
                            )}
                            {selectedNode.comment && (
                                <div className="italic font-mono">
                                    # {selectedNode.comment}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Line number */}
            {selectedNode.line !== undefined && (
                <div className="text-xs text-muted pt-1 border-t border-base">
                    Line {selectedNode.line}
                    {selectedNode.endLine && selectedNode.endLine !== selectedNode.line && ` - ${selectedNode.endLine}`}
                </div>
            )}
        </div>
    );
};
