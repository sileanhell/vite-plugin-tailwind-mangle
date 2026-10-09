import "./style.css";

const PANEL = "card 2xl:p-8 hover:bg-blue-600 w-1/2";
const ICON_TYPE = "image/png";
const ROW = "relative items-center";
const LINK = "text-gray-400 [&.active]:text-white";

const app = document.querySelector<HTMLElement>("#app")!;
app.className = PANEL;
app.setAttribute("data-type", ICON_TYPE);
app.firstElementChild?.setAttribute("class", ROW);
app.lastElementChild?.setAttribute("class", LINK);
app.style.overflow = "hidden";
app.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-in-out" });
