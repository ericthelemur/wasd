import './people.scss';

import clone from 'clone';
import {
    Category, Icon, People, PeopleBank, Person, Social, Socials
} from 'nodecg-people-control/src/types/schemas';
import { useEffect, useState } from 'react';
import { At } from 'react-bootstrap-icons';
import Badge from 'react-bootstrap/badge';
import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

const defaultSocials: () => Socials = () => ({
    unknown: {
        "name": "Unknown",
        "iconType": "svg",
        "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" fill=\"currentColor\" class=\"bi bi-at\" viewBox=\"0 0 16 16\"><path d=\"M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914\"/></svg>"
    },
})

function IconComp({ icon }: { icon?: Icon }) {
    try {
        if (icon && icon.iconType === "svg") return <span className="icon" dangerouslySetInnerHTML={{ __html: icon.icon }} />
    } catch { }
    return <span className="icon"><At size="1em" /></span>
}

function SocialIcon({ social }: { social: string }) {
    const [socials,] = useReplicant<Socials>("socials", defaultSocials(), { namespace: "nodecg-people-control" });
    const icon = socials ? socials[social] : undefined;
    return <IconComp icon={icon} />;
}

function SocialComp({ social }: { social?: Social }) {
    return <div className="vcentre gap-2" style={{ fontSize: "0.7em", height: "22px" }} >
        {social ? <>
            <SocialIcon social={social.social} />
            <Textfit mode="multi" max={22} style={{ fontSize: "22px", height: "22px" }} className="social vcentre">
                {social.name}
            </Textfit>
        </> : " "}
    </div>
}

function NameComp({ name, pronouns }: { name: string, pronouns: string }) {
    return <Textfit mode="multi" style={{ height: "32px" }} max={32}>
        <div className='name gap-2 vcentre'>
            <span className="flex-grow-1">{name}</span>
            {pronouns && <span className="pronouns"><span>{pronouns.replaceAll("\/", "$&\u200b")}</span></span>}
        </div>
    </Textfit>

}

export function CategoryComp({ cat }: { cat: Category }) {
    // Quite ugly, but transition element is kinda awkward here
    if (!cat) return <div>No category exists</div>

    const [bank,] = useReplicant<PeopleBank>("peopleBank", {}, { namespace: "nodecg-people-control" })

    const [personIndex, setPersonIndex] = useState<number>(0);
    const [personID, setPersonID] = useState<string>("");
    const [person, setPerson] = useState<Person | null>(null);
    // Pass down to PersonComp, here for key on transition
    const [socialIndex, setSocialIndex] = useState(0);
    const [social, setSocial] = useState<Social | undefined>(clone(person?.socials[socialIndex]));

    // Trigger person load once bank loaded
    useEffect(() => {
        if (bank && !person) updatePersonSocials(0);
    }, [bank, cat, personID])

    // Set person and social details for new
    function updatePersonSocials(pi: number) {
        const personId = cat.people[pi];
        setPersonID(personId);
        if (!personId) return setPerson(null);
        const p = bank![personId];
        if (!p) return setPerson(null);
        setPerson(clone(p));

        setSocialIndex(0);
        setSocial(clone(p.socials[0]));
    }

    // Find next non blank person
    function findNextPerson() {
        if (cat.people.length <= 1) return;
        for (var i = 1; i <= cat.people.length; i++) {
            var newPersonIndex = (personIndex + i) % cat.people.length;
            if (cat.people[newPersonIndex] && bank![cat.people[newPersonIndex]] && bank![cat.people[newPersonIndex]].name) {
                setPersonIndex(newPersonIndex);
                updatePersonSocials(newPersonIndex);
                return;
            }
        }
        setPerson(null);
        setPersonID("");
        setPersonIndex(-1);
    }

    function findNextSocial() {
        if (!person) return;
        if (person.socials.length <= 1) return;
        for (var i = 1; i <= person.socials.length; i++) {
            var newSocIndex = (socialIndex + i) % person.socials.length;
            if (person.socials[newSocIndex] && person.socials[newSocIndex].name) {
                setSocialIndex(newSocIndex);
                setSocial(clone(person.socials[newSocIndex]));
                return;
            }
        }
        setSocialIndex(-1);
        setSocial(undefined);
    }

    // Periodically move to next social index for person
    // Move to next person if out of socials
    useEffect(() => {
        var time = person && person.socials && person.socials.length >= 3 ? 6000 / person.socials.length : 2000;
        // const time = 3000;
        const timeout = setTimeout(() => {
            if (!person) return;
            var newSocIndex = socialIndex + 1;
            if (newSocIndex >= person.socials.length) {
                findNextPerson();
            } else {
                findNextSocial();
            }
        }, time);
        return () => clearTimeout(timeout);
    }, [person, socialIndex]);

    if (!person || !person.name) return <></>
    const animTime = 400;
    return <div className="d-flex h2 lh-1 gap-2" style={{ fontSize: "2rem", fontWeight: 600 }}>
        <IconComp icon={cat.icon} />
        <div className="person flex-grow-1" style={{ "--enter-time": `${animTime}ms`, "--leave-time": `${animTime}ms` } as unknown as React.CSSProperties}>
            <ReactCSSTransitionReplace key="name" transitionName="fade-wait" transitionEnterTimeout={2 * animTime} transitionLeaveTimeout={animTime}>
                <span key={personID}><NameComp name={person.name} pronouns={person.pronouns} /></span>
            </ReactCSSTransitionReplace>

            <ReactCSSTransitionReplace key="social" transitionName="fade-wait" transitionEnterTimeout={2 * animTime} transitionLeaveTimeout={animTime}>
                <span key={`${personID}::${social?.id}`}><SocialComp social={social} /></span>
            </ReactCSSTransitionReplace>
        </div>
    </div>
}

export function People({ cat }: { cat?: string }) {
    const [people,] = useReplicant<People>("people", { all: { name: "All", people: [] } }, { namespace: "nodecg-people-control" })
    if (!people) return <></>;
    const category = people[cat ?? "all"];
    return <CategoryComp cat={category} />
}