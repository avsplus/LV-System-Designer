import AVCanvas from './pages/AVCanvas';
import DeviceManager from './pages/DeviceManager';
import Account from './pages/Account';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "DeviceManager": DeviceManager,
    "Account": Account,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
};