// This JavaScript code exports an async generator function called streamAsyncIterable that streams data from a specified stream.

// The function uses the getReader method of the stream object to get a ReadableStreamReader object, which it stores in a variable called reader. It then enters an infinite while loop and uses the read method of the reader to read a chunk of data from the stream. If the done property of the resulting object is true, it returns from the generator function. Otherwise, it yields the value property of the object, which represents the chunk of data read from the stream.

// Finally, the function has a finally block that calls the releaseLock method of the reader to release the lock on the stream, allowing other consumers to read from it.

export async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
