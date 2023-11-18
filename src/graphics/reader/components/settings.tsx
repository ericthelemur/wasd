import { useState } from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';

import * as icons from './icons';

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

export function Settings(props: SettingsProps) {
    return <details id="settings" className='m2'>
        <summary className='btn btn-primary'>
            <i className='bi bi-gear-fill'></i>
        </summary>
        <div id="dropdown" className='bg-body-secondary'>
            <h5>Local Settings</h5>
            <RadioSetting name="list" title="Donation list" labels={true} current={props.settings.list}
                options={[icons.live, icons.all]}
                default={"live"}
                onclick={(v) => props.setSettings({ ...props.settings, list: v })}
            />
            <CheckSetting name="show" title="Filters" current={props.settings.show}
                options={[icons.read, icons.unread, icons.approved, icons.undecided, icons.censored]}
                default={["unread", "approved", "undecided"]}
                onclick={(v) => props.setSettings({ ...props.settings, show: v })}
            />
            <RadioSetting name="dir" title="Sort by" current={props.settings.dir}
                options={[icons.dsc, icons.asc]}
                default={"dsc"}
                onclick={(v) => props.setSettings({ ...props.settings, dir: v })}
            />{" "}
            <RadioSetting name="sort" current={props.settings.sort}
                options={[icons.time, icons.money]}
                default={"time"}
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
    default: T;
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