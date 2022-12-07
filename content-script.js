const search_text = document.querySelector("input.gLFyf").value;
main();

async function main() {
  initializeResultCard();
  const time1 = performance.now();
  const cachedResult = fetchCachedQuestionResult(search_text);
  if (cachedResult) {
    updateContentDOM(cachedResult.result, {}, time1);
    // question is already present remove from the cache and add at the end
    addToLocalStorage(search_text, cachedResult.result);
  } else {
    // const response = fetchChatGPTResult(search_text);
    const response = await fetchOpenAIResult(search_text);
    if (response.choices) {
      addToLocalStorage(search_text, response.choices[0].text);
    }
    updateContentDOM("", response, time1);
  }
}

function initializeResultCard() {
  const parentNode = document.getElementById("cnt");
  const margin_left = window
    .getComputedStyle(document.getElementById("center_col"), null)
    .getPropertyValue("margin-left");

  const resultCardContentTemplate = `
  <div id="gptxCardHeader">
    <span id="gptxLoadingPara">Loading results from OpenAI...</span>
    <span id="gptxTimePara"></span>
  </div>
  <div id="gptxCardBody">
    <p id="gptxResponsePara"></p>
  </div>
`;
  /**
 * <div id="gptxCardFooter">
    <span><img height="20" width="20" id="gptxFooterRefreshIcon" /></span>
  </div>
 */
  const newNode = document.createElement("div");
  newNode.classList.add("gptxCard");

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    // add border color for dark mode
    newNode.style.border = "0.2px solid #373b3e";
  } else {
    // add border color for light mode
    newNode.style.border = "1px solid #dadce0";
  }

  newNode.innerHTML = resultCardContentTemplate;

  // Get a reference to the child node before which you want to insert the new node
  const referenceNode = document.getElementById("rcnt");
  const max_width = window
    .getComputedStyle(referenceNode, null)
    .getPropertyValue("max-width");

  newNode.style["margin-left"] = margin_left;
  newNode.style["max-width"] = max_width;

  // Insert the new node before the reference node
  parentNode.insertBefore(newNode, referenceNode);
}

function getFromLocalStorage(key) {
  return localStorage.getItem(key);
}

// async function fetchAccessToken() {
//   /**
//    * returns access_token if present in cache
//    * else fetches access token from https://chat.openai.com/api/auth/session
//    */
//   sessionKey = getFromLocalStorage("session_key");
//   if (sessionKey) {
//     return sessionKey;
//   }
//   // await will pause the execution till the response is fetched
//   const response = await fetch("https://chat.openai.com/api/auth/session");
//   const respJSON = await response.json();
//   return respJSON;
//   // if (response.accessToken) {
//   //   localStorage.setItem("session_key", response.accessToken);
//   //   return response.accessToken;
//   // }
//   // return "";
// }

function generateUUID() {
  var dt = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      var r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}

async function fetchOpenAIResult(question) {
  const API_KEY = "ENTER_YOUR_KEY";

  // Set up the request body with the query text
  const requestBody = {
    model: "text-davinci-003",
    prompt: search_text,
    max_tokens: 256,
    temperature: 0.5,
    top_p: 1.0,
  };

  // Set up the request options
  const requestOptions = {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
  };

  // Use the fetch API to send the request to the OpenAI API
  const response = await fetch(
    "https://api.openai.com/v1/completions",
    requestOptions
  );
  const respJSON = await response.json();
  return respJSON;
}

// async function fetchChatGPTResult(question) {
//   const accessToken = await fetchAccessToken();
//   if (accessToken) {
//     // Set up the request body with the query text
//     const requestBody = {
//       action: "next",
//       messages: [
//         {
//           id: generateUUID,
//           role: "user",
//           content: {
//             content_type: "text",
//             parts: [question],
//           },
//         },
//       ],
//       model: "text-davinci-002-render",
//       parent_message_id: generateUUID(),
//     };

//     // Set up the request options
//     const requestOptions = {
//       method: "POST",
//       mode: "no-cors",
//       body: JSON.stringify(requestBody),
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${accessToken}`,
//       },
//     };

//     // Use the fetch API to send the request to the OpenAI API
//     const response = await fetch(
//       "https://chat.openai.com/backend-api/conversation",
//       requestOptions
//     )
//       .then((r) => {
//         r.json();
//       })
//       .catch((error) => {
//         console.log(error);
//       });
//     return response;
//   } else {
//     return { text: "LOGIN_REQUIRED" };
//   }
// }

function updateContentDOM(resultText = "", apiResponse = {}, time1) {
  gptxCardHeaderElem = document.getElementById("gptxCardHeader");
  gptxLoadingParaElem = document.getElementById("gptxLoadingPara");
  gptxTimeParaElem = document.getElementById("gptxTimePara");
  gptxResponseParaElem = document.getElementById("gptxResponsePara");
  gptxCardFooterElem = document.getElementById("gptxCardFooter");
  // gptxCardFooterElem.style.display = "block";
  // gptxFooterRefreshIconElem = document.getElementById("gptxFooterRefreshIcon");
  // const gptxRefreshIconURL = chrome.runtime.getURL("img/refresh.svg");
  // console.log(gptxFooterRefreshIconElem, gptxRefreshIconURL);
  // gptxFooterRefreshIconElem.src = "img/refresh.svg";
  let time2;
  if (resultText) {
    gptxLoadingParaElem.innerHTML = "OpenAI powered results";
    gptxTimeParaElem.style.display = "inline";
    gptxResponseParaElem.innerHTML = resultText;
    gptxResponseParaElem.style["margin-bottom"] = "0px";
    time2 = performance.now();
    gptxTimeParaElem.innerHTML =
      "(" + ((time2 - time1) / 1000).toFixed(2) + " seconds)";
    gptxCardHeader.style.float = "right";
  } else {
    if (apiResponse.choices) {
      gptxLoadingParaElem.innerHTML = "OpenAI powered results";
      gptxTimeParaElem.style.display = "inline";
      gptxResponseParaElem.innerHTML = apiResponse.choices[0].text;
      time2 = performance.now();
      gptxTimeParaElem.innerHTML =
        "(" + ((time2 - time1) / 1000).toFixed(2) + " seconds)";
    } else if (apiResponse.error) {
      gptxLoadingParaElem.style.display = "none";
      gptxResponseParaElem.style["margin-top"] = "0px";
      gptxResponseParaElem.innerHTML = apiResponse.error.message;
    } else {
      gptxLoadingParaElem.style.display = "none";
      gptxResponseParaElem.style["margin-top"] = "0px";
      gptxResponseParaElem.innerHTML = "Error fetching data";
    }
    gptxResponseParaElem.style["margin-bottom"] = "0px";
    gptxCardHeader.style.float = "right";
  }
}

function addToLocalStorage(question, result) {
  let cache = JSON.parse(getFromLocalStorage("questionAnswers") || "[]");
  if (cache.some((obj) => obj.question === question)) {
    // question is already present remove from the cache and add at the end
    cache = cache.filter(function (obj) {
      return obj.question !== question;
    });
  }
  if (cache.length >= 5) {
    // if it has, remove the oldest item from the cache
    cache.shift();
  }
  // add the new result to the cache
  cache.push({ question: question, result: result });
  localStorage.setItem("questionAnswers", JSON.stringify(cache));
}

function fetchCachedQuestionResult(question) {
  const cache = JSON.parse(getFromLocalStorage("questionAnswers"), "[]");
  if (cache) {
    return cache.find((item) => item.question === question);
  }
  return null;
}
