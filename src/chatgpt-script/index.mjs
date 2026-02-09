/**
 * This content script is for
 * copying all Question-Answers to clipboard
 * copying only Answers to clipboard
 */
import { getCopyIconSvg, getApprovedCheckIconSvg } from '../constants/template-strings.mjs'
import { copyText } from '../utils/clipboard-utils.mjs'

const navElem = document.getElementsByTagName('nav')['0']
// created copy entire thread button
const copyQAElem = document.createElement('a')
const copyQAElemClasses =
  'flex py-3 px-3 items-center gap-4 rounded-md hover:bg-gray-800 transition-colors duration-200 text-white cursor-pointer text-sm'
copyQAElem.classList = copyQAElemClasses.split()
copyQAElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy entire thread`
navElem.appendChild(copyQAElem)

// created copy only answer button
const copyAnswersElem = document.createElement('a')
const copyAnswersElemClasses =
  'flex py-3 px-3 items-center gap-4 rounded-md hover:bg-gray-800 transition-colors duration-200 text-white cursor-pointer text-sm'
copyAnswersElem.classList = copyAnswersElemClasses.split()
copyAnswersElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy all answers`
navElem.appendChild(copyAnswersElem)

// const parentElem = document.getElementsByClassName(
//   'flex flex-col items-center text-sm h-full dark:bg-gray-800',
// )['0']
const allQAElems = document.getElementsByClassName(
  'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group',
)
const onlyAnswerElems = document.getElementsByClassName(
  'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group bg-gray-50 dark:bg-[#444654]',
)
copyQAElem.addEventListener('click', () => {
  if (Object.keys(allQAElems).length > 0) {
    // setting the copy entire thread icon
    copyQAElem.innerHTML = `${getApprovedCheckIconSvg('1.2em', '1.2em', 'green')}Copied`
    copyQAElem.style.color = 'green'
    // Set a timeout to change the button text back after 1 second
    setTimeout(function () {
      copyQAElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy entire thread`
      copyQAElem.style.color = ''
    }, 700)

    // copying entire thread to clipboard
    let entireThread = ''
    const divider = '\n\n' + '='.repeat(50) + '\n\n'
    Object.keys(allQAElems).forEach((key, index) => {
      entireThread += `${index % 2 === 0 ? 'Question:' : 'Answer:'} ${allQAElems[key].outerText} ${
        index % 2 === 0 ? '\n' : divider
      }`
    })
    copyText(entireThread)
  }
})

copyAnswersElem.addEventListener('click', () => {
  if (Object.keys(onlyAnswerElems).length > 0) {
    // setting the copy answers icon
    copyAnswersElem.innerHTML = `${getApprovedCheckIconSvg('1.2em', '1.2em', 'green')}Copied`
    copyAnswersElem.style.color = 'green'
    // Set a timeout to change the button text back after 1 second
    setTimeout(function () {
      copyAnswersElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy all answers`
      copyAnswersElem.style.color = ''
    }, 700)

    // copying only answers to clipboard
    let entireThread = ''
    Object.keys(onlyAnswerElems).forEach((key, index) => {
      entireThread += `${index + 1} => ${onlyAnswerElems[key].outerText}\n\n\n`
    })
    copyText(entireThread)
  }
})
