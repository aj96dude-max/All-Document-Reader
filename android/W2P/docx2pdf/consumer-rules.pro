# Consumer rules ensure apps importing this AAR also ignore the POI awt missing classes
-dontwarn java.awt.**
-dontwarn javax.xml.**
-dontwarn sun.misc.Unsafe
-keep class org.apache.poi.** { *; }
-keep class org.openxmlformats.** { *; }
-keep class schemaorg_apache_xmlbeans.** { *; }
