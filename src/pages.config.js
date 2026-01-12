import Admin from './pages/Admin';
import AgentManager from './pages/AgentManager';
import Billing from './pages/Billing';
import DeviceManager from './pages/DeviceManager';
import Home from './pages/Home';
import Landing from './pages/Landing';
import NetworkMapping from './pages/NetworkMapping';
import NoOrganization from './pages/NoOrganization';
import PendingApproval from './pages/PendingApproval';
import Settings from './pages/Settings';
import SetupOrganization from './pages/SetupOrganization';
import WirePricing from './pages/WirePricing';
import account from './pages/account';
import AVCanvas from './pages/AVCanvas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AgentManager": AgentManager,
    "Billing": Billing,
    "DeviceManager": DeviceManager,
    "Home": Home,
    "Landing": Landing,
    "NetworkMapping": NetworkMapping,
    "NoOrganization": NoOrganization,
    "PendingApproval": PendingApproval,
    "Settings": Settings,
    "SetupOrganization": SetupOrganization,
    "WirePricing": WirePricing,
    "account": account,
    "AVCanvas": AVCanvas,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
    Layout: __Layout,
};