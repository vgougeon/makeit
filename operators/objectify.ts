export function objectify(data: any, defaultValue: any = []) {
    if(!data) return defaultValue
    if(Array.isArray(data)) {
        return data.map((entry: any) => {
            return objectifyItem(entry)
        })
    }
    else return objectifyItem(data)
}

function objectifyItem(item: object) {
    return (
        Object.entries(item).reduce((acc: any, [key, value]: any) => {
            key = key.split('.')
            key.shift()
            key = key.join('.')
            let initialKey = key
            acc[key] = value 

            while(true) {
                key = key.split('.')
                if(key.length <= 1) break;
                else if(value === null && key.length > 1) {
                    delete acc[initialKey]
                    break;
                }
                else {
                    acc[key[0]] = (typeof acc[key[0]] === 'object' && acc[key[0]] !== null) ? acc[key[0]] : {}
                    acc[key[0]][key[key.length - 1]] = value
                    key.shift();
                    if(key.length <= 1) delete acc[initialKey]
                    key = key.join('.')
                };
            }
            return acc
        }, {})
    )
}