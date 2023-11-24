import Button from 'react-bootstrap/Button';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';

import * as icons from './icons';
import { defaultSettings } from '../reader.graphic';

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
    return <details id="settings" className='m2'>
        <summary className='btn btn-primary'>
            <i className='bi bi-gear-fill'></i>
        </summary>
        <div id="dropdown" className='bg-body-secondary'>
            <small className='float-end'>
                <Button variant="outline-primary" className="px-2 py-1 small" onClick={(e) => {
                    const curr_light = localStorage.getItem("dark_mode") == "light";
                    localStorage.setItem("dark_mode", !curr_light ? "light" : "dark");
                    dark();
                }}><i className="bi bi-moon-fill"></i></Button>{" "}
                <Button variant="outline-primary" className="px-2 py-1 small" onClick={(e) => {
                    props.setSettings(defaultSettings);
                }}><i className="bi bi-arrow-counterclockwise"></i></Button>
            </small>

            <h5>Local Settings</h5>
            <RadioSetting name="list" title="Donation list" labels={true} current={props.settings.list}
                options={[icons.live, icons.all, icons.donors, icons.incentives]}
                onclick={(v) => props.setSettings({ ...props.settings, list: v })}
            />
            <CheckSetting name="show" title="Filters" current={props.settings.show}
                options={[icons.unread, icons.read]}
                onclick={(v) => props.setSettings({ ...props.settings, show: v })}
            />{" "}
            <CheckSetting name="show" current={props.settings.show}
                options={[icons.approved, icons.undecided, icons.censored]}
                onclick={(v) => props.setSettings({ ...props.settings, show: v })}
            />
            <RadioSetting name="dir" title="Sort by" current={props.settings.dir}
                options={[icons.dsc, icons.asc]}
                onclick={(v) => props.setSettings({ ...props.settings, dir: v })}
            />{" "}
            <RadioSetting name="sort" current={props.settings.sort}
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
    options: icons.ModAction[];
    current: T;
    onclick: (v: T) => void;
}

export function CheckSetting(props: SettingProps<string[]>) {
    return <>
        {props.title ? <h6>{props.title}</h6> : ""}
        <ToggleButtonGroup type="checkbox" name={props.name} value={props.current} onChange={props.onclick}>
            {props.options.map(o => (
                <ToggleButton id={`btn-${o.category}`} key={o.category} value={o.category} variant="outline-primary">
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
                <ToggleButton id={`btn-${o.category}`} key={o.category} value={o.category} variant="outline-primary">
                    {o.icon}{" "}{props.labels && o.action}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    </>
}