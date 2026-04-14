import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="relative overflow-hidden px-6 md:px-16 lg:px-24 xl:px-32 w-full text-sm text-slate-500 bg-white pt-10">
            <img
                src="/assets/logo.svg"
                alt="Logo"
                width={400}
                height={400}
                className="hidden md:block absolute -bottom-30 -left-80 opacity-5 w-full h-full pointer-events-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-14">
                <div className="sm:col-span-2 lg:col-span-1">
                    <a href="/#home">
                        <img
                            src="/assets/logo.svg"
                            alt="Logo"
                            width={68}
                            height={26}
                            className="h-7 w-auto"
                        />
                    </a>
                    <p className="mt-6 text-sm/7">
                        Singing Duck docs are focused on JavaScript developers. Configure DB and PostHog first,
                        then verify with curl and begin integrating your logic.
                    </p>
                </div>
                <div className="flex flex-col lg:items-center lg:justify-center">
                    <div className="flex flex-col text-sm space-y-2.5">
                        <h2 className="mb-5 font-semibold text-gray-800">Documentation</h2>
                        <a className="transition hover:text-slate-600" href="/#features">Highlights</a>
                        <a className="transition hover:text-slate-600" href="/#process">Setup Flow</a>
                        <a className="transition hover:text-slate-600" href="/#pricing">curl Test</a>
                        <a className="transition hover:text-slate-600" href="/#home">JavaScript Guide</a>
                    </div>
                </div>
                <div>
                    <h2 className="mb-5 font-semibold text-gray-800">Contribute</h2>
                    <div className="text-sm space-y-6 max-w-sm">
                        <p>
                            This project is open-source. To contribute new features or request implementations,
                            send an email directly.
                        </p>
                        <div className="flex items-center">
                            <a
                                href="mailto:your-email@example.com"
                                className="rounded-md bg-linear-to-b from-gray-700 to-gray-900 px-4 py-2.5 text-white transition hover:from-gray-800 hover:to-black"
                            >
                                Mail for Contribution
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-t mt-6 border-slate-200">
                <p className="text-center">
                    Copyright 2026 © Singing Duck Docs. Built for developers.
                </p>
                <div className="flex items-center gap-4">
                    <Link to="/#home">
                        Overview
                    </Link>
                    <Link to="/#process">
                        Setup
                    </Link>
                    <Link to="/#pricing">
                        curl Check
                    </Link>
                </div>
            </div>
        </footer>
    );
};