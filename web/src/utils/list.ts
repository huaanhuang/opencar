export const fillIndex = (list: any[]): any[] => {
    let result: any[] = []
    list.forEach((item, index) => {
        result.push({
            ...item,
            index: index + 1,
        })
    })
    return result
}