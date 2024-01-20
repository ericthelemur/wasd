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

function SocialComp({ social }: { social: Social }) {
    return <div className="vcentre gap-2" style={{ fontSize: "0.7em" }} >
        <SocialIcon social={social.social} />
        <Textfit mode="multi" max={22} style={{ width: "250px", fontSize: "22px", height: "22px" }} className="social vcentre">
            {social.name}
        </Textfit>
    </div>
}

function NameComp({ name, pronouns }: { name: string, pronouns: string }) {
    return <Textfit mode="multi" style={{ height: "32px", width: "300px" }} max={32}>
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

    // Update person to match new person index & reset socials
    useEffect(() => {
        updatePersonSocials(personIndex);
    }, [personIndex, cat, bank]);

    // Periodically move to next social index for person
    // Move to next person if out of socials
    useEffect(() => {
        var time = person && person.socials && person.socials.length >= 3 ? 6000 / person.socials.length : 2000;
        if (!social || !social.name) time = 0;  // Move to next immediately if empty
        // const time = 3000;
        const timeout = setTimeout(() => {
            if (!person) return;
            var newIndex = socialIndex + 1;
            if (newIndex >= person.socials.length) {
                var newIndex = personIndex + 1;
                if (newIndex >= cat.people.length) newIndex = 0;
                setPersonIndex(newIndex);
                updatePersonSocials(newIndex);
            } else {
                setSocialIndex(newIndex);
                setSocial(clone(person.socials[newIndex]));
            }
        }, time);
        return () => clearTimeout(timeout);
    }, [person, socialIndex]);

    if (!person) return <>No Person</>
    return <div className="person flex-grow-1">
        <ReactCSSTransitionReplace key="name" transitionName="people" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
            <span key={personID}><NameComp name={person.name} pronouns={person.pronouns} /></span>
        </ReactCSSTransitionReplace>

        <ReactCSSTransitionReplace key="social" transitionName="people" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
            <span key={`${personID}::${social?.id}`}>{social ? <SocialComp social={social} /> : " "}</span>
        </ReactCSSTransitionReplace>
    </div>
}

export function People({ cat }: { cat?: string }) {
    const [people,] = useReplicant<People>("people", { all: { name: "All", people: [] } }, { namespace: "nodecg-people-control" })
    if (!people) return <></>;
    const category = people[cat ?? "all"];
    return <div className="d-flex h2 lh-1 gap-2" style={{ fontSize: "2rem", fontWeight: 600 }}>
        <IconComp icon={category?.icon} />
        <CategoryComp cat={category} />
    </div>
}