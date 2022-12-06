const search_text = document.querySelector("input.gLFyf").value;
const previous_text = localStorage.getItem("searchText");
if (previous_text !== search_text) {
  localStorage.setItem("searchText", search_text);
}
const parentNode = document.getElementById("cnt");
const margin_left = window
  .getComputedStyle(document.getElementById("center_col"), null)
  .getPropertyValue("margin-left");

/**
 * Template for OpenAI powered search card
  <div class="card">
    <p id="loadingPara">Loading...</p>
    <p id="timePara">{{ time to fetch openai }}</p>
    <p id="responsePara">{{ response from openai api }}</p>
  </div>
 */
const newNode = document.createElement("div");
newNode.classList.add("card");

const loadingPara = document.createElement("div");
loadingPara.id = "loadingPara";
loadingPara.innerHTML = "Loading results from OpenAI...";

const timePara = document.createElement("div");
timePara.id = "timePara";
timePara.style = { display: "none" };

const responsePara = document.createElement("p");
responsePara.id = "response";

newNode.appendChild(loadingPara);
newNode.appendChild(timePara);
newNode.appendChild(responsePara);

// Get a reference to the child node before which you want to insert the new node
const referenceNode = document.getElementById("rcnt");
const max_width = window
  .getComputedStyle(referenceNode, null)
  .getPropertyValue("max-width");

newNode.style["margin-left"] = margin_left;
newNode.style["max-width"] = max_width;

// Insert the new node before the reference node
parentNode.insertBefore(newNode, referenceNode);

let time1, time2;
if (previous_text === search_text) {
  time1 = performance.now();
  loadingPara.innerHTML = "OpenAI powered results";
  timePara.style.display = "inline";
  responsePara.innerHTML = localStorage.getItem("search_result");
  responsePara.style["margin-bottom"] = "0px";
  time2 = performance.now();
  timePara.innerHTML = "(" + ((time2 - time1) / 1000).toFixed(2) + " seconds)";
} else {
  API_KEY = "YOUR_API_KEY";
  time1 = performance.now();
  // Set up the request body with the query text
  const requestBody = {
    model: "text-davinci-003",
    prompt: search_text,
    max_tokens: 256,
    temperature: 0.7,
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
  fetch("https://api.openai.com/v1/completions", requestOptions)
    .then((response) => {
      return response.json();
    })
    .then((responseData) => {
      // Hide loading animation and display response
      time2 = performance.now();
      localStorage.setItem("search_result", responseData.choices[0].text);
      loadingPara.innerHTML = "OpenAI powered results";
      timePara.style.display = "inline";
      timePara.innerHTML =
        "(" + ((time2 - time1) / 1000).toFixed(4) + " seconds)";
      responsePara.innerHTML = responseData.choices[0].text;
      responsePara.style["margin-bottom"] = "0px";
    })
    .catch((error) => {
      console.log(error);
    });
}
