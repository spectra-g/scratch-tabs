import React from 'react';
import { Copy } from 'lucide-react';

interface JsonNodeProps {
  data: any;
  currentPath?: string;
  onPathSelect: (path: string) => void;
  isRoot?: boolean; // To avoid wrapping root object/array in extra braces/brackets
}

const JsonNode: React.FC<JsonNodeProps> = ({
  data,
  currentPath = '',
  onPathSelect,
  isRoot = false,
}) => {
  const getNodeType = (value: any) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const nodeType = getNodeType(data);

  const renderValue = (value: any, path: string) => {
    const type = getNodeType(value);
    switch (type) {
      case 'object':
      case 'array':
        return <JsonNode data={value} currentPath={path} onPathSelect={onPathSelect} />;
      case 'string':
        return <span className="text-green-400">"{value}"</span>;
      case 'number':
        return <span className="text-blue-400">{value}</span>;
      case 'boolean':
        return <span className="text-purple-400">{String(value)}</span>;
      case 'null':
        return <span className="text-gray-500">null</span>;
      default:
        return <span className="text-red-400">unknown</span>;
    }
  };

  const handleKeyClick = (path: string) => {
    onPathSelect(path);
  };

  if (nodeType === 'object') {
    const entries = Object.entries(data);
    return (
      <div className={`ml-${isRoot ? 0 : 4}`}>
        {!isRoot && <span className="text-gray-400">{'{'}</span>}
        {entries.length === 0 && !isRoot && <span className="text-gray-400">{'}'}</span>}
        {entries.length > 0 && (
          <div className={`ml-4 border-l border-gray-700 pl-2`}>
            {entries.map(([key, value], index) => {
              const newPath = currentPath ? `${currentPath}.${key}` : key;
              return (
                <div key={key} className="flex items-start space-x-1 group">
                   <span
                     className="text-orange-400 cursor-pointer hover:underline flex items-center"
                     onClick={() => handleKeyClick(newPath)}
                     title={`Click to select path: ${newPath}`}
                   >
                     "{key}"
                     <Copy className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity w-3 h-3" />
                   </span>
                   <span className="text-gray-400">:</span>
                   <div className="flex-1">{renderValue(value, newPath)}</div>
                </div>
              );
            })}
          </div>
        )}
         {entries.length > 0 && !isRoot && <span className="text-gray-400">{'}'}</span>}
      </div>
    );
  }

  if (nodeType === 'array') {
    return (
      <div className={`ml-${isRoot ? 0 : 4}`}>
         {!isRoot && <span className="text-gray-400">{'['}</span>}
         {data.length === 0 && !isRoot && <span className="text-gray-400">{']'}</span>}
         {data.length > 0 && (
           <div className={`ml-4 border-l border-gray-700 pl-2`}>
            {data.map((item: any, index: number) => {
              const newPath = `${currentPath}[${index}]`;
              // Option 1: Make the index itself clickable (less intuitive maybe)
              // Option 2: Just render the item, path selection happens via parent keys
              // Let's stick to clicking keys for now as per the primary request,
              // but the path passed down correctly handles array indices.
              // If you want to select the path *to* an array item, you could add a clickable index or icon here.
              return (
                 <div key={index} className="flex items-start space-x-1 group">
                    {/* Example: Clickable index */}
                   
                    <span
                        className="text-cyan-400 cursor-pointer hover:underline flex items-center"
                        onClick={() => handleKeyClick(newPath)}
                        title={`Click to select path: ${newPath}`}
                    >
                        {index}
                        <Copy className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity w-3 h-3" />
                    </span>
                    <span className="text-gray-400">:</span>

                    <div className="flex-1">{renderValue(item, newPath)}</div>
                 </div>
              );
            })}
          </div>
         )}
         {data.length > 0 && !isRoot && <span className="text-gray-400">{']'}</span>}
      </div>
    );
  }

  // Render primitives directly if they are the root element (unlikely for JSON)
  if (isRoot) {
     return renderValue(data, '');
  }

  // Primitives rendered by their parent object/array renderValue call
  return null;
};

export default JsonNode;