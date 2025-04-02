import React from 'react';
import {languageRegistry} from '../../languages';

interface LanguageSelectorProps {
    onSelect: (langId: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({onSelect}) => {
    return (
        languageRegistry.getAll().map(lang => (
            <button
                key={lang.id}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-600 text-xs text-gray-200"
                onClick={() => onSelect(lang.id)}
            >
                {lang.name}
            </button>
        ))
    );
};