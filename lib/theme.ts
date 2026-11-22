export const THEME_KEY = "nova-theme";

/**
 * Runs in <head> before the first paint, so a saved theme never flashes the wrong colours.
 * With nothing saved, the CSS follows the system setting.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
