/*
This JavaScript code exports a function called fetchSSE that makes a fetch request to a specified resource and streams the response using an async iterable. It also processes the response using an event source parser, which is imported from the eventsource-parser module.

The function takes two arguments: resource, which is the URL of the resource to fetch, and options, which is an object that can contain an onMessage callback and other options to pass to the fetch function.

The fetchSSE function first destructures the options object to get the onMessage callback and any other fetch options. It then makes the fetch request to the specified resource and stores the response in a variable called resp.

Next, the function creates an event source parser using the createParser function, which is passed a callback that is called whenever an event is received. If the event is an event type, the callback calls the onMessage function with the event data.

Finally, the function uses a for-await-of loop to iterate over the chunks of the response body, which is made async iterable using the streamAsyncIterable function. For each chunk, it creates a new TextDecoder and decodes the chunk into a string. It then feeds the string to the event source parser using the parser.feed method. This causes the parser to parse the string and call the callback for any events it finds.
*/

import { createParser } from 'eventsource-parser'
import { streamAsyncIterable } from './stream-async-iterable.mjs'

export async function fetchSSE(resource, options) {
  const { onMessage, ...fetchOptions } = options
  const resp = await fetch(resource, fetchOptions)
  const parser = createParser((event) => {
    if (event.type === 'event') {
      onMessage(event.data)
    }
  })
  for await (const chunk of streamAsyncIterable(resp.body)) {
    const str = new TextDecoder().decode(chunk)
    parser.feed(str)
  }
}
