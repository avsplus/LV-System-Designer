import AVCanvas from './pages/AVCanvas';
import DeviceManager from './pages/DeviceManager';
import account from './pages/account';
import Admin from './pages/Admin';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "DeviceManager": DeviceManager,
    "account": account,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
};