/** @param {Date} date */
export function formatDate(date) {
	return new Intl.DateTimeFormat('en-DE').format(date)
}

/** @param {string} dateString */
function differenceInDays(dateString) {
	const date = new Date(dateString).getTime()
	const today = Date.now()
	const diffTime = Math.abs(today - date)
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/** @param {string} dateString */
export function relativeDate(dateString) {
	const days = differenceInDays(dateString)
	return `${days} day${days > 1 ? 's' : ''} ago`
}

/** Returns a fancy cosmic time duration string
 * @param {string} dateString */
export function relativeDateSolar(dateString) {
	const days = differenceInDays(dateString)
	const years = Math.floor(days / 365)
	const remainingDays = days % 365
	const yearsString = years ? `${years} sun orbit${years > 1 ? 's' : ''}` : ''
	const andString = years && remainingDays ? ', ' : ''
	const daysString = `${remainingDays} earth rotation${remainingDays > 1 ? 's' : ''}`
	return `${yearsString}${andString}${daysString}`
}
