import { useMutation } from "convex/react"
import { useCallback } from "react"

import { api } from "@convex/_generated/api"

export function useUploadFile() {
	const generateUploadUrl = useMutation(api.r2.generateUploadUrl)
	const syncMetadata = useMutation(api.r2.syncMetadata)

	const uploadFile = useCallback(
		async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
			const { url, key } = await generateUploadUrl()

			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest()
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable && onProgress) {
						onProgress(Math.round((e.loaded / e.total) * 100))
					}
				}
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve()
					} else {
						reject(new Error(`Upload failed: ${xhr.statusText}`))
					}
				}
				xhr.onerror = () => reject(new Error("Upload failed"))
				xhr.open("PUT", url)
				xhr.setRequestHeader("Content-Type", file.type)
				xhr.send(file)
			})

			await syncMetadata({ key })
			return key
		},
		[generateUploadUrl, syncMetadata],
	)

	return { uploadFile }
}
