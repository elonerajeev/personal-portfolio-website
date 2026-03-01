import React, {createContext, useContext, useEffect, useState} from 'react'
import {useUtils} from "/src/helpers/utils.js"
import {useEmails} from "/src/helpers/emails.js"
import {SkeletonProfile, SkeletonText, SkeletonCard} from "/src/components/generic/Skeleton.jsx"

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

const Status = {
    NOT_LOADED: 0,
    LOADING: 1,
    LOADED: 2
}

const PRIORITY_SECTION_IDS = ['about']

export const DataProvider = ({children}) => {
    const utils = useUtils()
    const emails = useEmails()

    const [status, setStatus] = useState(Status.NOT_LOADED)
    const [jsonData, setJsonData] = useState({
        settings: {},
        strings: {},
        sections: [],
        categories: []
    })
    const [dataValidated, setDataValidated] = useState(false)
    const [sectionLoadMap, setSectionLoadMap] = useState({})

    useEffect(() => {
        setStatus(Status.LOADING)
        _load().then(r => {})
    }, [])

    useEffect(() => {
        if(!jsonData.settings || !Object.keys(jsonData.settings).length)
            return

        if(!dataValidated) {
            _validate()
        }

        if(jsonData.settings['emailjs']) {
            emails.init(jsonData.settings['emailjs'])
        }
    }, [jsonData])

    const _load = async () => {
        const [jSettings, jStrings, jStructure] = await Promise.all([
            _loadJson("/data/settings.json"),
            _loadJson("/data/strings.json"),
            _loadJson("/data/structure.json")
        ])

        const categories = jStructure["categories"]
        const sections = jStructure["sections"]
        const hashSectionId = window.location.hash.replace('#', '')
        const prioritySectionIds = new Set([
            ...PRIORITY_SECTION_IDS,
            sections[0]?.id,
            hashSectionId
        ].filter(Boolean))

        const prioritySections = []
        const lazySections = []

        for(const section of sections) {
            const category = categories.find(category => category.id === section["categoryId"])
            if(!category) {
                throw new Error(`[DataProvider] The section with id "${section.id}" has an invalid categoryId "${section["categoryId"]}". There's no such category.`)
            }
            section.category = category
            
            if(prioritySectionIds.has(section.id)) {
                prioritySections.push(section)
            } else {
                lazySections.push(section)
            }
        }

        // Load priority sections first
        await Promise.all(prioritySections.map(async section => {
            section.content = await _loadJson(section["jsonPath"])
        }))

        const initialLoadMap = {}
        sections.forEach(section => {
            initialLoadMap[section.id] = Boolean(section.content)
        })
        setSectionLoadMap(initialLoadMap)

        const filteredCategories = categories.filter(category => {
            return sections.find(section => section.categoryId === category.id)
        })

        setJsonData(prevState => ({
            ...prevState,
            settings: jSettings,
            strings: jStrings,
            categories: filteredCategories,
            sections: jStructure["sections"]
        }))

        setStatus(Status.LOADED)

        // Load remaining sections in background
        lazySections.forEach(section => {
            _loadJson(section["jsonPath"]).then((content) => {
                section.content = content

                setSectionLoadMap(prevState => ({
                    ...prevState,
                    [section.id]: true
                }))

                setJsonData(prevState => ({
                    ...prevState,
                    sections: [...prevState.sections]
                }))
            }).catch(() => {
                setSectionLoadMap(prevState => ({
                    ...prevState,
                    [section.id]: false
                }))
            })
        })
    }

    const _validate = () => {
        const sections = jsonData.sections
        if(!sections.length) {
            return
        }

        setDataValidated(true)
    }

    const _loadJson = async (path) => {
        const actualPath = utils.resolvePath(path)
        const request = await fetch(actualPath)
        return request.json()
    }

    const getSettings = () => {
        return jsonData.settings
    }

    const getStrings = () => {
        return jsonData.strings
    }

    const getSections = () => {
        return jsonData.sections
    }

    const getCategories = () => {
        return jsonData.categories
    }

    const getCategorySections = (category) => {
        if(!category)
            return []
        return jsonData.sections.filter(section => section["categoryId"] === category.id)
    }

    const listImagesForCache = () => {
        const settings = getSettings()
        const sections = getSections()

        if(!settings.profile || !Array.isArray(settings['supportedLanguages'])) {
            return []
        }

        const images = [
            utils.resolvePath(settings.profile['logoUrl']),
            utils.resolvePath(settings.profile['profilePictureUrl'])
        ]

        //Language Regarding
        settings['supportedLanguages'].forEach(lang => {
            images.push(utils.resolvePath(lang['flagUrl']))
        })

        sections.forEach(section => {
            if(!section.content || !section.content.articles)
                return

            section.content.articles.forEach(article => {
                if(!article.items)
                    return

                article.items.forEach(item => {
                    if(!item.icon || !item.icon.img)
                        return

                    images.push(utils.resolvePath(item.icon.img))
                })
            })
        })

        return images
    }

    const isLoading = () => {
        return status !== Status.LOADED || !dataValidated
    }

    const isSectionLoaded = (sectionId) => {
        return Boolean(sectionLoadMap[sectionId])
    }

    const getSectionLoadingProgress = () => {
        const sections = getSections()
        const total = sections.length
        const loaded = sections.filter(section => isSectionLoaded(section.id)).length

        return {
            loaded,
            total
        }
    }

    const areAllSectionsLoaded = () => {
        const progress = getSectionLoadingProgress()
        return progress.total > 0 && progress.loaded >= progress.total
    }

    const contextValue = {
        getSettings,
        getStrings,
        getSections,
        getCategories,
        getCategorySections,
        listImagesForCache,
        isLoading,
        isSectionLoaded,
        getSectionLoadingProgress,
        areAllSectionsLoaded
    }

    return (
        <DataContext.Provider value={contextValue}>
            {isLoading() ? (
                <InitialLoadingScreen/>
            ) : (
                <>{children}</>
            )}
        </DataContext.Provider>
    )
}

function InitialLoadingScreen() {
    return (
        <div style={{padding: '40px', maxWidth: '1200px', margin: '0 auto'}}>
            <SkeletonProfile/>
            <div style={{marginTop: 30}}>
                <SkeletonText lines={4}/>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
                marginTop: 30
            }}>
                <SkeletonCard/>
                <SkeletonCard/>
                <SkeletonCard/>
            </div>
        </div>
    )
}
