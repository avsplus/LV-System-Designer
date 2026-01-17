import AVCanvas from './pages/AVCanvas';
import Admin from './pages/Admin';
import AgentManager from './pages/AgentManager';
import Billing from './pages/Billing';
import DeviceManager from './pages/DeviceManager';
import FabricTest from './pages/FabricTest';
import Home from './pages/Home';
import Landing from './pages/Landing';
import NetworkMapping from './pages/NetworkMapping';
import NoOrganization from './pages/NoOrganization';
import PendingApproval from './pages/PendingApproval';
import Settings from './pages/Settings';
import SetupOrganization from './pages/SetupOrganization';
import WirePricing from './pages/WirePricing';
import account from './pages/account';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AVCanvas": AVCanvas,
    "Admin": Admin,
    "AgentManager": AgentManager,
    "Billing": Billing,
    "DeviceManager": DeviceManager,
    "FabricTest": FabricTest,
    "Home": Home,
    "Landing": Landing,
    "NetworkMapping": NetworkMapping,
    "NoOrganization": NoOrganization,
    "PendingApproval": PendingApproval,
    "Settings": Settings,
    "SetupOrganization": SetupOrganization,
    "WirePricing": WirePricing,
    "account": account,
}

export const pagesConfig = {
    mainPage: "AVCanvas",
    Pages: PAGES,
    Layout: __Layout,
};