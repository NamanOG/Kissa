import { nativeImage } from 'electron'

const playBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA8SURBVDhPYxgFowA3YARiZiBmAeK/UDYIswIxMxCzAvFfKBuEWYE4D8TMRDSIF4j/QtkgzArEeeTjUTAAAG0bB4zM+X6kAAAAAElFTkSuQmCC'

const pauseBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA2SURBVDhPYxgFgxUwAjEzELMA8V8oG4RZgZgZiFmB+C+UDcKsQMwMxKxQNgizAjEzELNGwUAAAN/VB4zOxt3vAAAAAElFTkSuQmCC'

const prevBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA+SURBVDhPYxgFoxgwAjEzELMA8V8oG4RZgZgZiFmB+C+UDcK8QIwPxI8I0cQLxP9R1QpEExvGjKpmFIwCAAA4iQeMVX9BsgAAAABJRU5ErkJggg=='

const nextBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA+SURBVDhPYxgFwxgwAjEzELMA8V8oG4RZgTgfxMxENIh5gRgfiB8RoomLGoFoYsOYUdUMYsNYEAxixCgYBQAALrQHjG2L9lMAAAAASUVORK5CYII='

export const getPlayIcon = () => nativeImage.createFromDataURL(`data:image/png;base64,${playBase64}`)
export const getPauseIcon = () => nativeImage.createFromDataURL(`data:image/png;base64,${pauseBase64}`)
export const getPrevIcon = () => nativeImage.createFromDataURL(`data:image/png;base64,${prevBase64}`)
export const getNextIcon = () => nativeImage.createFromDataURL(`data:image/png;base64,${nextBase64}`)
