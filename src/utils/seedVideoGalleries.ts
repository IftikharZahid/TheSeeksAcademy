import { db } from '../api/firebaseConfig';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

// Chai aur Code YouTube Playlists - Actual Content
const SEED_GALLERIES = [
    {
        id: 'chai-aur-javascript',
        name: 'Chai aur JavaScript',
        description: 'Complete JavaScript course in Hindi - 51 lessons from basics to advanced',
        thumbnail: '',
        videos: [
            { id: 'js1', title: 'JavaScript Roadmap | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=sscX432bMZo', duration: '14:22' },
            { id: 'js2', title: 'JavaScript kaise kaam karta hai? | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=3m2DWQcJi10', duration: '08:45' },
            { id: 'js3', title: 'Variables, Constants and Memory | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=JvDCjLvNW9E', duration: '18:32' },
            { id: 'js4', title: 'Datatypes and ECMA standards | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=DG4F6Kly7LA', duration: '22:18' },
            { id: 'js5', title: 'Type Conversion and Operations | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=58P5b5jdm8Y', duration: '25:45' },
            { id: 'js6', title: 'Strings in JavaScript | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=fozwNnFunlo', duration: '28:12' },
            { id: 'js7', title: 'Numbers and Maths | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=fHB0S1mXfJQ', duration: '21:35' },
            { id: 'js8', title: 'Date and Time | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=U0Q9g4MhJXk', duration: '16:48' },
            { id: 'js9', title: 'Arrays in JavaScript | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=HjZ-rAL3yHA', duration: '32:25' },
            { id: 'js10', title: 'Objects in JavaScript | chai aur javascript', youtubeUrl: 'https://www.youtube.com/watch?v=b-L2p_4eSo8', duration: '35:42' },
        ],
    },
    {
        id: 'chai-aur-react',
        name: 'Chai aur React',
        description: 'Complete React JS course with projects - Learn modern React development',
        thumbnail: '',
        videos: [
            { id: 'react1', title: 'React JS Roadmap | chai aur react', youtubeUrl: 'https://www.youtube.com/watch?v=FxgM9k1rg0Q', duration: '12:38' },
            { id: 'react2', title: 'Create React Projects | chai aur react', youtubeUrl: 'https://www.youtube.com/watch?v=k3KqQvywToE', duration: '18:25' },
            { id: 'react3', title: 'Understand the React Flow and Structure', youtubeUrl: 'https://www.youtube.com/watch?v=yNbnA5pryMg', duration: '28:42' },
            { id: 'react4', title: 'Create your own React library and JSX', youtubeUrl: 'https://www.youtube.com/watch?v=kAOuj6o7Kxs', duration: '32:15' },
            { id: 'react5', title: 'Why you need hooks and projects', youtubeUrl: 'https://www.youtube.com/watch?v=lI7IIOWM0Mo', duration: '45:22' },
            { id: 'react6', title: 'Virtual DOM, Fibre and Reconciliation', youtubeUrl: 'https://www.youtube.com/watch?v=MPCVGFvgVEQ', duration: '25:18' },
            { id: 'react7', title: 'Tailwind and Props in React', youtubeUrl: 'https://www.youtube.com/watch?v=bB6707XzCNc', duration: '38:45' },
            { id: 'react8', title: 'A react interview question on Counter', youtubeUrl: 'https://www.youtube.com/watch?v=tOYkV6Yhrhs', duration: '22:35' },
        ],
    },
    {
        id: 'chai-aur-python',
        name: 'Chai aur Python',
        description: 'Python programming in Hindi - From basics to advanced with projects',
        thumbnail: '',
        videos: [
            { id: 'py1', title: 'Python Introduction | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=UrsmFxEIp5k', duration: '15:32' },
            { id: 'py2', title: 'Python Installation and Setup', youtubeUrl: 'https://www.youtube.com/watch?v=3w0LdEBKnDE', duration: '12:45' },
            { id: 'py3', title: 'Variables in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=d4G5hRuQ_2c', duration: '22:18' },
            { id: 'py4', title: 'Data Types in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=YUgrWNbEbGY', duration: '28:35' },
            { id: 'py5', title: 'Strings in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=WMpxJMcN1Ls', duration: '32:42' },
            { id: 'py6', title: 'Lists in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=Eaz5e6M8tL4', duration: '35:15' },
            { id: 'py7', title: 'Dictionaries in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=4V05sBG7rrc', duration: '28:48' },
            { id: 'py8', title: 'Functions in Python | chai aur python', youtubeUrl: 'https://www.youtube.com/watch?v=N_OOf7pG2LA', duration: '42:22' },
        ],
    },
    {
        id: 'chai-aur-backend',
        name: 'Chai aur Backend',
        description: 'Complete Backend Development with Node.js, Express & MongoDB',
        thumbnail: '',
        videos: [
            { id: 'be1', title: 'Backend roadmap | chai aur backend', youtubeUrl: 'https://www.youtube.com/watch?v=ChVE-JbtYbM', duration: '18:25' },
            { id: 'be2', title: 'How to deploy backend code in production', youtubeUrl: 'https://www.youtube.com/watch?v=VNxP6r1rpOk', duration: '32:45' },
            { id: 'be3', title: 'How to connect frontend and backend', youtubeUrl: 'https://www.youtube.com/watch?v=fFHyqhmnVfs', duration: '28:32' },
            { id: 'be4', title: 'Data modelling for backend with mongoose', youtubeUrl: 'https://www.youtube.com/watch?v=VWy3xqPraM0', duration: '45:18' },
            { id: 'be5', title: 'Ecommerce and Hospital Data Modelling', youtubeUrl: 'https://www.youtube.com/watch?v=aJGpSN1-e68', duration: '38:42' },
            { id: 'be6', title: 'How to setup a professional backend project', youtubeUrl: 'https://www.youtube.com/watch?v=9BOXaGPPgGc', duration: '52:25' },
            { id: 'be7', title: 'How to connect database in MERN', youtubeUrl: 'https://www.youtube.com/watch?v=_p-e7dJA8_4', duration: '35:48' },
            { id: 'be8', title: 'Custom API response and error handling', youtubeUrl: 'https://www.youtube.com/watch?v=W8GPtBJByuA', duration: '42:35' },
        ],
    },
    {
        id: 'chai-aur-html',
        name: 'Chai aur HTML',
        description: 'Web Development Basics - Learn HTML from scratch in Hindi',
        thumbnail: '',
        videos: [
            { id: 'html1', title: 'HTML Introduction | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=HcOc7P5BMi4', duration: '12:35' },
            { id: 'html2', title: 'HTML Basic Structure | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=BGeDBfCIqas', duration: '18:22' },
            { id: 'html3', title: 'HTML Headings and Paragraphs', youtubeUrl: 'https://www.youtube.com/watch?v=naWE5v0jG3E', duration: '15:45' },
            { id: 'html4', title: 'HTML Links and Images | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=XXFoP6IMv4g', duration: '22:18' },
            { id: 'html5', title: 'HTML Forms Complete | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=GGox0bxZg5k', duration: '35:42' },
            { id: 'html6', title: 'HTML Tables | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=VT-b0PKtqAM', duration: '25:15' },
        ],
    },
    {
        id: 'chai-aur-git',
        name: 'Chai aur Git/GitHub',
        description: 'Version Control with Git and GitHub - Complete Guide in Hindi',
        thumbnail: '',
        videos: [
            { id: 'git1', title: 'Git and GitHub Introduction | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=q8EevlEpQ2A', duration: '16:25' },
            { id: 'git2', title: 'Git Installation and Setup', youtubeUrl: 'https://www.youtube.com/watch?v=qsTthZi23VE', duration: '12:38' },
            { id: 'git3', title: 'Git Commands Complete | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=nBzZp0AKt6c', duration: '28:45' },
            { id: 'git4', title: 'Push Code to GitHub | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=vbQ2bYHxxEA', duration: '22:32' },
            { id: 'git5', title: 'Branching in Git | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=M2a7OQX8te4', duration: '32:18' },
            { id: 'git6', title: 'Git Merge and Conflicts | chai aur code', youtubeUrl: 'https://www.youtube.com/watch?v=FXDjmsiv8fI', duration: '25:42' },
        ],
    },
];

/**
 * Seeds the video galleries collection with Chai aur Code playlists if empty
 * Call this function once when the app starts (e.g., in AdminDashboard)
 */
export const seedVideoGalleries = async (): Promise<boolean> => {
    try {
        const galleriesRef = collection(db, 'videoGalleries');
        const snapshot = await getDocs(galleriesRef);

        // Only seed if collection is empty
        if (snapshot.empty) {
            console.log('🎬 Seeding video galleries with Chai aur Code playlists...');

            for (const gallery of SEED_GALLERIES) {
                await setDoc(doc(db, 'videoGalleries', gallery.id), {
                    name: gallery.name,
                    description: gallery.description,
                    thumbnail: gallery.thumbnail,
                    videos: gallery.videos,
                });
                console.log(`✅ Added: ${gallery.name}`);
            }

            console.log('🎉 Video galleries seeded successfully!');
            return true;
        } else {
            console.log('📂 Video galleries already exist, skipping seed.');
            return false;
        }
    } catch (error) {
        console.error('❌ Error seeding video galleries:', error);
        return false;
    }
};

export default seedVideoGalleries;
