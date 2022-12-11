import clipboard from 'clipboardy'
import { getCopyIconSvg, getApprovedCheckIconSvg } from '../constants/templateStrings.mjs'

const navElem = document.getElementsByTagName('nav')['0']
const copyElem = document.createElement('a')
const copyElemClasses =
  'flex py-3 px-3 items-center gap-4 rounded-md hover:bg-gray-800 transition-colors duration-200 text-white cursor-pointer text-sm'
copyElem.classList = copyElemClasses.split()
copyElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy entire thread`
navElem.appendChild(copyElem)

const copyAnswersElem = document.createElement('a')
const copyAnswersElemClasses =
  'flex py-3 px-3 items-center gap-4 rounded-md hover:bg-gray-800 transition-colors duration-200 text-white cursor-pointer text-sm'
copyAnswersElem.classList = copyAnswersElemClasses.split()
copyAnswersElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy all answers`
navElem.appendChild(copyAnswersElem)

copyElem.addEventListener('click', () => {
  const parentElem = document.getElementsByClassName(
    'flex flex-col items-center text-sm h-full dark:bg-gray-800',
  )['0']
  const childElems = parentElem.getElementsByClassName(
    'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group',
  )
  if (Object.keys(childElems).length > 0) {
    copyElem.innerHTML = `${getApprovedCheckIconSvg('1.2em', '1.2em', 'green')}Copied`
    copyElem.style.color = 'green'
    // Set a timeout to change the button text back after 1 second
    setTimeout(function () {
      copyElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy entire thread`
      copyElem.style.color = ''
    }, 700)
  }
  let entireThread = ''
  const divider = '\n\n' + '='.repeat(50) + '\n\n'
  Object.keys(childElems).forEach((key, index) => {
    entireThread += `${index % 2 === 0 ? 'Question:' : 'Answer:'} ${childElems[key].outerText} ${
      index % 2 === 0 ? '\n' : divider
    }`
  })
  clipboard.write(entireThread).then(() => {
    console.log('gptx: chatgpt entire thread copied')
  })
})

copyAnswersElem.addEventListener('click', () => {
  const parentElem = document.getElementsByClassName(
    'flex flex-col items-center text-sm h-full dark:bg-gray-800',
  )['0']
  const childElems = parentElem.getElementsByClassName(
    'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group bg-gray-50 dark:bg-[#444654]',
  )
  if (Object.keys(childElems).length > 0) {
    copyAnswersElem.innerHTML = `${getApprovedCheckIconSvg('1.2em', '1.2em', 'green')}Copied`
    copyAnswersElem.style.color = 'green'
    // Set a timeout to change the button text back after 1 second
    setTimeout(function () {
      copyAnswersElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy all answers`
      copyAnswersElem.style.color = ''
    }, 700)
  }
  let entireThread = ''
  Object.keys(childElems).forEach((key, index) => {
    entireThread += `${index + 1} => ${childElems[key].outerText}\n\n\n`
  })
  clipboard.write(entireThread).then(() => {
    console.log('gptx: chatgpt all answers copied')
  })
})
