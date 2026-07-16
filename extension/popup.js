function setVersionText() {
  const versionElement = document.querySelector("#version");
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `Version ${manifest.version}`;
}

function handleConnectionClick() {
  const feedback = document.querySelector("#feedback");
  feedback.textContent = "Coming Soon";
}

function initializePopup() {
  setVersionText();

  const button = document.querySelector("#check-connection");
  button.addEventListener("click", handleConnectionClick);
}

document.addEventListener("DOMContentLoaded", initializePopup);
