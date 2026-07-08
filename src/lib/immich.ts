import { IMMICH_URL, IMMICH_API_KEY } from "$env/static/private";
import {
	getAllAlbums,
	init,
	searchAssets,
	type AssetResponseDto,
} from "@immich/sdk";

init({ baseUrl: IMMICH_URL, apiKey: IMMICH_API_KEY });

export const getAlbums = () => getAllAlbums({});

export const paginateAlbumAssets = async (id: string, page: number = 0) => {
	const n = 100;
	const res = await searchAssets({
		metadataSearchDto: {
			albumIds: [id],
			withExif: true,
			size: n,
			page,
		},
	});
	return {
		assets: res.assets.items,
		next: Number(res.assets.nextPage),
		hasNext: res.assets.nextPage !== null,
	};
};

export const getAllAlbumAssets = async (id: string) => {
	let page = 0;
	let hasNext = true;
	const assets: AssetResponseDto[] = [];

	while (hasNext) {
		const res = await paginateAlbumAssets(id, page);
		assets.push(...res.assets);
		page = res.next ?? undefined;
		hasNext = res.hasNext;
	}
};
