import "./style.css";

const PANEL = "card 2xl:p-8 hover:bg-blue-600 w-1/2";
const ICON_TYPE = "image/png";

const app = document.querySelector("#app")!;
app.className = PANEL;
app.setAttribute("data-type", ICON_TYPE);
