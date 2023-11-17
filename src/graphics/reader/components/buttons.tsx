import { CENSORED, ModStatus, UNDECIDED } from 'nodecg-tiltify/src/extension/utils/mod';
import { Donation } from 'nodecg-tiltify/src/types/schemas/donations';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Settings } from 'types/schemas/settings';
import { useReplicant } from 'use-nodecg';

import { DonoProp } from '../utils';
import * as icons from './icons';

function changeModStatus(dono: Donation, to: ModStatus, property = "modstatus") {
    return () => {
        console.log(`Attempting to set ${property} to ${to} for ${dono.id}`);
        dono.timeToApprove = 8.64e15;
        // Confirm uncensoring
        if (property === "modstatus" && dono.modStatus === CENSORED) {
            var confirmUncensor = confirm("Are you sure you want to uncensor this donation?" + `\nName: ${dono.donor_name}\nMessage: ${dono.donor_comment}`);
            if (confirmUncensor != true) return;
        }
        console.log("set-donation-" + property, [{ id: dono.id }, to]);
        nodecg.sendMessageToBundle("set-donation-" + property, "nodecg-tiltify", [dono, to]);
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
    const [settings, _] = useReplicant<Settings>("donations", { autoapprove: false });
    const whitelist = !settings?.autoapprove || dono.timeToApprove === 8.64e15;

    var censorBtn: React.JSX.Element;
    var extraClasses = ["rounded-start"]
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
        <ButtonGroup>
            <ModButton dono={dono} true={icons.read} false={icons.unread} small={false} property="read" primaryTrue={true} extraClasses={["me-2", "rounded-end"]} />
            {censorBtn}
            <ModButton dono={dono} true={icons.undecided} false={whitelist ? icons.censored : icons.approved} small={true} property="modStatus" primaryTrue={false} extraClasses={["bonus-btn"]} />
        </ButtonGroup>
    )
}