export type ScannedFile = {
  id: string;
  name: string;
  uri: string; // content:// URI
  mimeType: string;
  extension: string;
  size: number;
  modifiedDate: number; // epoch ms
};

export type RootStackParamList = {
  MainTabs: undefined;
  FileList: {
    fileType: string;
  };
  FileViewer: {
    file: ScannedFile;
  };
};