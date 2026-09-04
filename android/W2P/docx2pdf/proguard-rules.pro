# Rules to make Apache POI work on Android by ignoring missing java.awt classes
-dontwarn java.awt.**
-dontwarn javax.xml.**
-dontwarn sun.misc.Unsafe
-keep class org.apache.poi.** { *; }
-keep class org.openxmlformats.** { *; }
-keep class schemaorg_apache_xmlbeans.** { *; }
