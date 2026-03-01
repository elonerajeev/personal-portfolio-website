const SECTION_LABELS = {
    about: "About me",
    education: "Education",
    skills: "Skills",
    resume: "Resume",
    experience: "Experience",
    portfolio: "Projects",
    achievements: "Achievements",
    updates: "Updates",
    contact: "Contact"
}

export const getSectionFallbackLabel = (sectionId) => {
    if(!sectionId) {
        return "Section"
    }

    if(SECTION_LABELS[sectionId]) {
        return SECTION_LABELS[sectionId]
    }

    const normalized = sectionId.replace(/[_-]+/g, " ").trim()
    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}
