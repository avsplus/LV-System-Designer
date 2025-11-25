import AVCanvas from './pages/AVCanvas';
import DeviceManager from './pages/DeviceManager';
import account from './pages/account';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "DeviceManager": DeviceManager,
    "account": account,
    "Admin": Admin,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
    Layout: __Layout,
};