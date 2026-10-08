import React from 'react'
import {useLanguage} from "/src/providers/LanguageProvider.jsx"
import DropdownPicker from "/src/components/generic/DropdownPicker.jsx"
import {useUtils} from "/src/helpers/utils.js"

function LanguagePicker({shrink}) {
    const utils = useUtils()
    const {setSelectedLanguage, getSelectedLanguage, getAvailableLanguages, canChangeLanguage, hasLanguages} = useLanguage()

    const selectedLanguage = getSelectedLanguage()
    const availableLanguages = getAvailableLanguages()

    const _toDropdownOption = (language) => {
        return {
            id: language.id,
            label: language.name,
            imgUrl: utils.resolvePath(language["flagUrl"])
        }
    }

    const _onOptionSelected = (langId) => {
        const language = availableLanguages.find(language => language.id === langId)
        setSelectedLanguage(language)
    }

    return (
        <div>
            {hasLanguages && (
                // With a single language there is nothing to switch to, so show it as a plain badge.
                <DropdownPicker selectedOption={_toDropdownOption(selectedLanguage)}
                                availableOptions={canChangeLanguage ? availableLanguages.map(_toDropdownOption) : [_toDropdownOption(selectedLanguage)]}
                                onOptionSelected={_onOptionSelected}
                                size={2}
                                tooltip={null}
                                alwaysForceDropdown={canChangeLanguage}
                                shrink={shrink}/>
            )}
        </div>
    )
}

export default LanguagePicker