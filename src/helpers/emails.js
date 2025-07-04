import emailjs from "@emailjs/browser";

const _status = {
    didInit: false,
    config: null
}

/**
 * Loads EmailJS config from public/data/emailjs.json if not provided.
 * @returns {Promise<Object>}
 */
const loadConfigFromPublic = async () => {
    const response = await fetch('/data/emailjs.json')
    if (!response.ok) throw new Error("Failed to load emailjs config")
    return await response.json()
}

export const useEmails = () => {
    /**
     * @param {Object} [config]
     */
    const init = async (config) => {
        if (!config) {
            config = await loadConfigFromPublic()
        }
        emailjs.init(config.publicKey)
        _status.config = config
        _status.didInit = true
    }

    /**
     * @return {boolean}
     */
    const isInitialized = () => {
        return _status.didInit
    }

    /**
     * @param {string} fromName
     * @param {string} fromEmail
     * @param {string} customSubject
     * @param {string }message
     * @return {Promise<boolean>|Boolean}
     */
    const sendContactEmail = async (fromName, fromEmail, customSubject, message) => {
        if (!isInitialized())
            return false

        // Change 'to_email' to match your EmailJS template variable for recipient!
        // TO this:
        const params = {
            name: fromName,           // matches {{name}} in template
            email: fromEmail,         // matches {{email}} in template  
            title: customSubject,     // matches {{title}} in template
            message: message          // matches message content
        }
        try {
            const response = await emailjs.send(
                _status.config['serviceId'],
                _status.config['templateId'],
                params
            )
            return true
        } catch (error) {
            console.error("EmailJS send error:", error)
            return false
        }
    }

    return {
        init,
        isInitialized,
        sendContactEmail
    }
}
