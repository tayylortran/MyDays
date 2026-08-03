export interface Circle {
    id: string;
    name: string;
    color: string;
    sort: number;
    updatedAt: number;
}

export interface Hangout {
    id: string;
    date: string;
    title: string;
    note: string;
    circleId: string;
    updatedAt: number;
}

export interface Photo {
    id: string;
    hangoutId: string;
    uri: string;
    thumbUri: string;
    sort: number;
    updatedAt: number;
}