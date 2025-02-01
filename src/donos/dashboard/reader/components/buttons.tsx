import { APPROVED, CENSORED, ModStatus, UNDECIDED } from 'tiltify/extension/utils/mod';
import Button from 'react-bootstrap/Button';
import { useReplicant } from 'use-nodecg';

import { DonoProp } from '../utils';
import * as icons from './icons';
import { NodeCGAPIClient } from '@nodecg/types/client/api/api.client';
import { DonoSettings, Donation } from 'types/schemas';

declare var nodecg: NodeCGAPIClient;

function changeModStatus(dono: Donation, to: ModStatus, property = "modstatus") {
    return () => {
        console.log(`Attempting to set ${property} to ${to} for ${dono.id}`);
        dono.timeToApprove = 8.64e15;
        // Confirm uncensoring
        if (property === "modstatus" && (dono.modStatus === CENSORED || to === CENSORED)) {
            var confirmUncensor = confirm(`Are you sure you want to ${to !== CENSORED ? "un" : ""}censor this donation?` + `\nName: ${dono.donor_name}\nMessage: ${dono.donor_comment}`);
            if (confirmUncensor != true) return;
        }
        console.log("set-donation-" + property, [{ id: dono.id }, to]);
        nodecg.sendMessage("set-donation-" + property, [dono, to]);
    }
}

interface ModButtonProps {
    dono: Donation;
    true: icons.ModAction;
    false: icons.ModAction;
    small: boolean;
    primaryTrue: boolean;
    property: string;
    extraClasses: string[];
}

export function ModButton(props: ModButtonProps) {
    const toggle = props.dono[props.property] !== props.true.value;
    const action = toggle ? props.true : props.false;

    return <Button variant={toggle && props.primaryTrue ? "primary" : "outline-primary"}
        onClick={changeModStatus(props.dono, action.value, props.property.toLowerCase())}
        className={props.extraClasses.join(" ")}
    >
        {action.iconAction}{props.small ? "" : " " + action.action}
    </Button>
}

export function Buttons({ dono }: DonoProp) {
    const [settings, _] = useReplicant<DonoSettings>("donoSettings", { autoapprove: false });
    const whitelist = !settings?.autoapprove || dono.timeToApprove === 8.64e15;

    var censorBtn: React.JSX.Element;
    var extraClasses = ["flex-grow-1"]
    if (whitelist) {
        censorBtn = <ModButton dono={dono} true={icons.approved} false={icons.censored} small={false} property="modStatus" primaryTrue={true} extraClasses={extraClasses} />;
    } else {
        if (dono.modStatus === UNDECIDED) extraClasses.push("censor-btn");
        censorBtn = <ModButton dono={dono} true={icons.censored} false={icons.approved} small={false} property="modStatus" primaryTrue={false} extraClasses={extraClasses} />;

        if (dono.modStatus === UNDECIDED) {
            console.log(censorBtn.props);
            // // If blacklisting, initiate count to auto-approval
            // if (dono.modStatus === UNDECIDED) {
            //     censorBtn.classList.add("censor-btn");
            //     censorBtn.dataset.timeToApprove = dono.timeToApprove;
            //     censorBtn.dataset.donoId = dono.id;
            //     updateCensorBtnTime(censorBtn);
            //     timerButtons.push(censorBtn);
        }
    }
    return (
        <div className="btn-toolbar gap-2" role="toolbar">
            <ModButton dono={dono} true={icons.read} false={icons.unread} small={false} property="read" primaryTrue={dono.modStatus === APPROVED} extraClasses={["w-50"]} />
            <div className="btn-group flex-grow-1" role="group">
                {censorBtn}
                <ModButton dono={dono} true={icons.undecided} false={whitelist ? icons.censored : icons.approved} small={true} property="modStatus" primaryTrue={false} extraClasses={["bonus-btn"]} />
            </div>
        </div>
    )
}