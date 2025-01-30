import Button from 'react-bootstrap/Button';
import Nav from 'react-bootstrap/Nav';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';

import { defaultSettings } from '../reader.graphic';
import * as icons from './icons';
import { ArrowCounterclockwise, GearFill, MoonFill } from 'react-bootstrap-icons';

export interface SortSettings {
    list: string;
    sort: string;
    dir: string,
    show: string[];
}

interface SettingsProps {
    settings: SortSettings;
    setSettings: React.Dispatch<React.SetStateAction<SortSettings>>;
}

declare function dark(): void;

export function Settings(props: SettingsProps) {
    const disabled = props.settings.list === "incentives";
    return <details id="settings" className='m2'>
        <summary className='btn btn-primary'>
            <GearFill />
        </summary>
        <div id="dropdown" className='bg-body-secondary'>
            <small className='float-end'>
                <Button variant="outline-primary" className="px-2 py-1 small" onClick={(e) => {
                    const curr_light = localStorage.getItem("dark_mode") == "light";
                    localStorage.setItem("dark_mode", !curr_light ? "light" : "dark");
                    dark();
                }}><MoonFill /></Button>{" "}
                <Button variant="outline-primary" className="px-2 py-1 small" disabled={disabled} onClick={(e) => {
                    props.setSettings(defaultSettings);
                }}><ArrowCounterclockwise /></Button>
            </small>

            <h5>Local Settings</h5>
            <CheckSetting name="show" title="Filters" current={props.settings.show} disabled={disabled}
                options={[icons.unread, icons.read]}
                onclick={(v) => props.setSettings({ ...props.settings, show: v })}
            />{" "}
            <CheckSetting name="show" current={props.settings.show} disabled={disabled}
                options={[icons.approved, icons.undecided, icons.censored]}
                onclick={(v) => props.setSettings({ ...props.settings, show: v })}
            />
            <RadioSetting name="dir" title="Sort by" current={props.settings.dir} disabled={disabled}
                options={[icons.dsc, icons.asc]}
                onclick={(v) => props.setSettings({ ...props.settings, dir: v })}
            />{" "}
            <RadioSetting name="sort" current={props.settings.sort} disabled={disabled}
                options={[icons.time, icons.money]}
                onclick={(v) => props.setSettings({ ...props.settings, sort: v })}
            />
        </div>
    </details >
}

interface SettingProps<T> {
    name: string;
    title?: string;
    labels?: boolean;
    disabled?: boolean;
    options: icons.ModAction[];
    current: T;
    onclick: (v: T) => void;
}

export function CheckSetting(props: SettingProps<string[]>) {
    return <>
        {props.title ? <h6>{props.title}</h6> : ""}
        <ToggleButtonGroup type="checkbox" name={props.name} value={props.current} onChange={props.onclick}>
            {props.options.map(o => (
                <ToggleButton id={`btn-${o.category}`} key={o.category} value={o.category} variant="outline-primary" disabled={props.disabled}>
                    {o.icon}{" "}{props.labels && o.action}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    </>
}

export function RadioSetting(props: SettingProps<string>) {
    return <>
        {props.title ? <h6>{props.title}</h6> : ""}
        <ToggleButtonGroup type="radio" name={props.name} value={props.current} onChange={props.onclick}>
            {props.options.map(o => (
                <ToggleButton id={`btn-${o.category}`} key={o.category} value={o.category} variant="outline-primary" disabled={props.disabled}>
                    {o.icon}{" "}{props.labels && o.action}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    </>
}


export function TabSetting(props: SettingProps<string>) {
    return <>
        {props.title ? <h6>{props.title}</h6> : ""}
        <Nav variant="tabs" defaultActiveKey={props.current}>
            {props.options.map(o => (
                <Nav.Item key={o.category}>
                    <Nav.Link eventKey={o.category} onClick={e => props.onclick(o.category)}>{o.icon}{" "}{props.labels && o.action}</Nav.Link>
                </Nav.Item>
            ))}
        </Nav>
    </>
}