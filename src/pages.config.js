import AVCanvas from './pages/AVCanvas';
import DeviceManager from './pages/DeviceManager';
import account from './pages/account';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "DeviceManager": DeviceManager,
    "account": account,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
};