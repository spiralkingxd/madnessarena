import { getDictionary } from "@/lib/i18n";

export default async function Loading() {
	const dict = await getDictionary();

	return (
		<div className="flex min-h-screen items-center justify-center p-8">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
				<p className="text-sm font-medium text-slate-400 animate-pulse">{dict.common.loading}</p>
			</div>
		</div>
	);
}