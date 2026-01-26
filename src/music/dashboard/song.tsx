import './song.scss';

import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

import { MusicData, Status } from 'types/schemas/music';
import { CSSProperties } from 'react';

export function CurrentSong({ height, maxFontSize }: { height?: number, maxFontSize?: number }) {
    const [track,] = useReplicant<MusicData>("musicData", null, { namespace: "music" });
    const [status,] = useReplicant<Status>("status", { connected: "disconnected", playing: false }, { namespace: "music" });

    if (!status || status.connected != "connected" || !status.playing || !track) return <div></div>;

    return <div className="song-outer card" style={{ "--art-height": `${height || 150}px` } as CSSProperties}>
        <ReactCSSTransitionReplace transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={1000} className="w-100">
            <div key={track.title} className="song fw-semibold">
                <div className="art">
                    {track.artwork && <img src={track.artwork} />}
                </div>
                <Textfit mode="multi" max={maxFontSize || 32} className="details">
                    <span className="name">{track.title}</span>
                    <p className="artist mb-0">{track.artist}</p>
                </Textfit>
            </div>
        </ReactCSSTransitionReplace>
    </div>
}