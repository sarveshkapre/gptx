import clipboard from 'clipboardy'
import { getCopyIconSvg } from '../constants/templateStrings.mjs'

const navElem = document.getElementsByTagName('nav')['0']
const copyElem = document.createElement('a')
const copyElemClasses =
  'flex py-3 px-3 items-center gap-4 rounded-md hover:bg-gray-800 transition-colors duration-200 text-white cursor-pointer text-sm'
copyElem.classList = copyElemClasses.split()
copyElem.innerHTML = `${getCopyIconSvg('1.2em', '1.2em', 'white')}Copy entire thread`
navElem.appendChild(copyElem)

copyElem.addEventListener('click', () => {
  const parentElem = document.getElementsByClassName(
    'flex flex-col items-center text-sm h-full dark:bg-gray-800',
  )['0']
  const childElems = parentElem.getElementsByClassName(
    'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group',
  )
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
