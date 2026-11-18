function t(){return document.documentElement.hasAttribute("data-motion-paused")}function o(e){document.documentElement.toggleAttribute("data-motion-paused",e),document.dispatchEvent(new Event("motionpausechange"))}function n(e){document.addEventListener("motionpausechange",e)}
export{t as a,o as b,n as c};
