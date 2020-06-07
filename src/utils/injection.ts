import {
    Container,
    injectable as inversifyInjectable,
    interfaces
} from "inversify"
import "reflect-metadata"

const ftContainer = new Container()

export function injectable<T>(constructor: interfaces.ServiceIdentifier<T>) {
    ftContainer.bind<T>(constructor).toSelf()
    return inversifyInjectable()(constructor)
}

export function singleton<T>(constructor: interfaces.ServiceIdentifier<T>) {
    ftContainer.bind<T>(constructor).toSelf().inSingletonScope()
    return inversifyInjectable()(constructor)
}

export function resolve<T>(type: interfaces.ServiceIdentifier<T>): T {
    return ftContainer.get(type)
}

export function fromFtContainer(): Container {
    return Container.merge(ftContainer, new Container()) as Container
}
