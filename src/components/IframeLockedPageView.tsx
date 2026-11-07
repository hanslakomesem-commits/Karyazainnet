import React from 'react';
import {AdminPinModal} from './AdminPinModal';
interface IframeLockedPageViewProps {title:string;onBackToHome:()=>void;onUnlockSuccess?:()=>void}
export const IframeLockedPageView:React.FC<IframeLockedPageViewProps>=({onBackToHome,onUnlockSuccess})=><AdminPinModal onClose={onBackToHome} onSuccess={onUnlockSuccess}/>;
