export default function CallToAction() {
    return (
        <section className="my-32 flex flex-col items-center justify-center px-4">
            <h3 className="max-w-2xl text-center font-domine text-3xl text-gray-800">
                Open-source project, contributions welcome
            </h3>
            <p className="mt-4 max-w-2xl text-center text-sm/6 text-gray-600">
                If you want a feature implemented, bug fixed, or docs improved, contribute and email me to collaborate
                on the next implementation.
            </p>

            <a
                href="mailto:your-email@example.com"
                className="mt-6 rounded-full bg-linear-to-b from-gray-700 to-gray-900 px-6 py-3 text-base text-white transition hover:from-gray-800 hover:to-black"
            >
                Email to Contribute
            </a>
        </section>
    );
}