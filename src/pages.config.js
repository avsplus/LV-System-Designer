import AVCanvas from './pages/AVCanvas';
import DeviceManager from './pages/DeviceManager';
import account from './pages/account';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import WirePricing from './pages/WirePricing';
import NoOrganization from './pages/NoOrganization';
import SetupOrganization from './pages/SetupOrganization';
import PendingApproval from './pages/PendingApproval';
import Billing from './pages/Billing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "DeviceManager": DeviceManager,
    "account": account,
    "Admin": Admin,
    "Settings": Settings,
    "WirePricing": WirePricing,
    "NoOrganization": NoOrganization,
    "SetupOrganization": SetupOrganization,
    "PendingApproval": PendingApproval,
    "Billing": Billing,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
    Layout: __Layout,
};