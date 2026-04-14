import { Code2Icon, DatabaseIcon, LineChartIcon } from "lucide-react";

interface Feature {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
    description: string;
}

export default function FeaturesSection() {

    const features: Feature[] = [
        {
            icon: Code2Icon,
            title: "Copy-Paste JavaScript Snippets",
            description: "Every section contains practical JS snippets with comments for easy customization.",
        },
        {
            icon: DatabaseIcon,
            title: "Database-First Setup Notes",
            description: "Clear prerequisites for DB connectivity and environment variables before API testing.",
        },
        {
            icon: LineChartIcon,
            title: "PostHog Integration Guidance",
            description: "Event tracking examples help validate flows during manual tests and curl checks.",
        },
    ];
    return (
        <div id="features" className="grid border mt-42 rounded-lg max-w-6xl mx-auto border-gray-200/70 grid-cols-1 divide-y divide-gray-200/70 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {features.map((item, index) => (
                <div key={index} className="flex flex-col items-start gap-4 hover:bg-gray-50 transition duration-300 p-8 pb-14">
                    <div className="flex items-center gap-2 text-gray-500">
                        <item.icon className="size-5" />
                        <h2 className="font-medium text-base">{item.title}</h2>
                    </div>
                    <p className="text-gray-500 text-sm/6 max-w-72">{item.description}</p>
                </div>
            ))}
        </div>
    );
}